import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../model/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

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
