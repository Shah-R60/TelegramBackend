import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../model/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// In-memory cache to track processed calls (prevents duplicate processing)
const processedCalls = new Map();

// Cleanup old entries every 5 minutes (calls older than 10 minutes)
setInterval(() => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [callId, timestamp] of processedCalls.entries()) {
        if (timestamp < tenMinutesAgo) {
            processedCalls.delete(callId);
        }
    }
}, 5 * 60 * 1000);

// Main webhook handler - handles call ended events
const handleStreamWebhook = asyncHandler(async (req, res) => {
    console.log('📨 [WEBHOOK] Received GetStream webhook:', req.body.type);
    
    const { type, call, user } = req.body;

    // Only handle call ended events
    if (type !== 'call.ended' && type !== 'call.session.ended') {
        console.log(`ℹ️ [WEBHOOK] Ignoring event type: ${type}`);
        return res.status(200).json({ message: 'Event received but not processed' });
    }

    console.log('📞 [WEBHOOK] Call ended event received');

    // Get duration from GetStream (already calculated in seconds)
    const duration = call?.duration || 0;
    const callId = call?.id || call?.cid;
    const userId = user?.id;

    console.log(`⏱️ [WEBHOOK] Call ${callId} duration: ${duration} seconds (${Math.floor(duration / 60)} minutes)`);

    // Check if this call was already processed (deduplication)
    if (processedCalls.has(callId)) {
        console.log(`⚠️ [WEBHOOK] Call ${callId} already processed, skipping duplicate`);
        return res.status(200).json({ 
            message: 'Duplicate event ignored',
            callId,
            alreadyProcessed: true
        });
    }

    // Mark call as processed
    processedCalls.set(callId, Date.now());

    // Check if call duration crossed 5 minutes (300 seconds) - reward users
    if (duration >= 300) {
        console.log('🎉 [WEBHOOK] Call duration >= 5 minutes, rewarding participants');
        
        // Get all participants from the call
        const participants = call?.session?.participants || call?.members || [];
        const participantIds = participants.map(p => p.user_id || p.user?.id).filter(Boolean);
        
        if (participantIds.length > 0) {
            for (const participantId of participantIds) {
                const participant = await User.findById(participantId);
                if (participant) {
                    participant.stars += 1;
                    await participant.save();
                    console.log(`💰 [REWARD] Increased 1 coin for user ${participantId}. New balance: ${participant.stars}`);
                }
            }
            
            return res.status(200).json({ 
                message: 'Reward applied for 5+ minute call',
                duration,
                rewardApplied: true,
                participantsRewarded: participantIds.length
            });
        } else {
            console.log('⚠️ [REWARD] No participant IDs found in call data');
        }
    }
    
    // Check if call ended before 1 minute (60 seconds) and we have user who ended it
    if (duration < 60 && userId) {
        console.log('⚠️ [WEBHOOK] Call ended early (< 1 minute)');
        
        // Find user who ended the call
        const userWhoEnded = await User.findById(userId);
        
        if (userWhoEnded && userWhoEnded.stars > 0) {
            // Deduct 1 coin
            userWhoEnded.stars -= 1;
            await userWhoEnded.save();
            
            console.log(`💰 [PENALTY] Deducted 1 coin from user ${userId}. New balance: ${userWhoEnded.stars}`);
            
            return res.status(200).json({ 
                message: 'Penalty applied',
                duration,
                penaltyApplied: true,
                newBalance: userWhoEnded.stars
            });
        } else {
            console.log(`⚠️ [PENALTY] User ${userId} has no coins to deduct or not found`);
        }
    } else if (duration >= 60) {
        console.log('✅ [WEBHOOK] Call duration acceptable, no penalty');
    } else {
        console.log('⚠️ [WEBHOOK] Missing user info, cannot apply penalty');
    }
    
    return res.status(200).json({ 
        message: 'Call ended processed',
        duration,
        penaltyApplied: false
    });
});

export {
    handleStreamWebhook
};
