import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../model/user.models.js";
import { Report } from "../model/report.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Helper: Check and reset weekly ban count if needed
const checkAndResetWeeklyBans = async (user) => {
    const now = new Date();
    
    // If weeklyBanResetDate is in the past or not set, reset it
    if (!user.weeklyBanResetDate || user.weeklyBanResetDate < now) {
        user.weeklyBanCount = 0;
        user.weeklyBanResetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        await user.save();
        console.log(`🔄 [REPORT] Reset weekly ban count for user ${user._id}`);
    }
};

// Helper: Check if user is in probation period
const isInProbation = (user) => {
    if (!user.probationExpiresAt) return false;
    return new Date() < user.probationExpiresAt;
};

// Helper: Apply auto-ban based on report count
const applyAutoBan = async (user) => {
    const now = new Date();
    
    // Check if ban already expired but not cleared
    if (user.isBanned && user.banExpiresAt && user.banExpiresAt < now) {
        console.log(`⏰ [BAN] Expired ban detected for user ${user._id}, clearing...`);
        user.isBanned = false;
        user.banExpiresAt = null;
        user.banReason = null;
        user.reportCount = 0; // Reset report count after ban expires
        await user.save();
    }
    
    // Check and reset weekly bans if needed
    await checkAndResetWeeklyBans(user);
    
    // If user reached 3 reports, apply ban
    if (user.reportCount >= 3) {
        const inProbation = isInProbation(user);
        
        // Check if user got 3 bans this week (→ 7-day ban)
        if (user.weeklyBanCount >= 2 || inProbation) {
            // Apply 7-day ban
            const banDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
            user.isBanned = true;
            user.banExpiresAt = new Date(now.getTime() + banDuration);
            user.banReason = inProbation 
                ? 'Multiple violations during probation period' 
                : 'Three 24-hour bans within one week';
            user.reportCount = 0;
            user.weeklyBanCount = 0; // Reset after 7-day ban
            user.weeklyBanResetDate = null;
            user.probationExpiresAt = null; // Clear probation
            
            // Add to ban history
            user.banHistory.push({
                bannedAt: now,
                banDuration: '7d',
                reason: user.banReason,
                reportCount: 3
            });
            
            await user.save();
            
            console.log(`🔒 [BAN] Applied 7-day ban to user ${user._id}`);
            return {
                banned: true,
                duration: '7d',
                expiresAt: user.banExpiresAt,
                reason: user.banReason
            };
        } else {
            // Apply 24-hour ban
            const banDuration = 24 * 60 * 60 * 1000; // 24 hours
            user.isBanned = true;
            user.banExpiresAt = new Date(now.getTime() + banDuration);
            user.banReason = 'Three reports received for violating community guidelines';
            user.reportCount = 0; // Reset after ban
            user.weeklyBanCount += 1;
            
            // Set probation if this was a 7-day ban recovery
            if (user.banHistory.length > 0) {
                const lastBan = user.banHistory[user.banHistory.length - 1];
                if (lastBan.banDuration === '7d') {
                    // 14-day probation after 7-day ban
                    user.probationExpiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                    console.log(`⚠️ [PROBATION] User ${user._id} entered 14-day probation period`);
                }
            }
            
            // Add to ban history
            user.banHistory.push({
                bannedAt: now,
                banDuration: '24h',
                reason: user.banReason,
                reportCount: 3
            });
            
            await user.save();
            
            console.log(`🔒 [BAN] Applied 24-hour ban to user ${user._id} (weekly ban count: ${user.weeklyBanCount}/3)`);
            return {
                banned: true,
                duration: '24h',
                expiresAt: user.banExpiresAt,
                reason: user.banReason,
                weeklyBanCount: user.weeklyBanCount,
                inProbation: user.probationExpiresAt ? true : false
            };
        }
    }
    
    return { banned: false };
};

// Submit a report
const submitReport = asyncHandler(async (req, res) => {
    const { reportedUserId, reason } = req.body;
    const reporterId = req.user._id;
    
    // Validation
    if (!reportedUserId || !reason) {
        throw new ApiError(400, "Missing required fields");
    }
    
    if (reportedUserId === reporterId.toString()) {
        throw new ApiError(400, "Cannot report yourself");
    }
    
    // Check if reporter has exceeded daily limit (3 reports/day)
    const reporter = await User.findById(reporterId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reportsToday = await Report.countDocuments({
        reporterId: reporterId,
        createdAt: { $gte: today }
    });
    
    if (reportsToday >= 3) {
        throw new ApiError(429, "You have reached the daily report limit (3 reports/day)");
    }
    
    // Create report (no duplicate check - users are anonymous)
    const report = await Report.create({
        reporterId,
        reportedUserId,
        reason
    });
    
    // Update reporter's reportsGiven count
    reporter.reportsGiven += 1;
    await reporter.save();
    
    // Update reported user's report count
    const reportedUser = await User.findById(reportedUserId);
    
    if (!reportedUser) {
        throw new ApiError(404, "Reported user not found");
    }
    
    reportedUser.reportCount += 1;
    reportedUser.lastReportDate = new Date();
    await reportedUser.save();
    
    console.log(`📝 [REPORT] User ${reporterId} reported ${reportedUserId} (reason: ${reason}). Total reports: ${reportedUser.reportCount}`);
    
    // Check if auto-ban should be applied
    const banResult = await applyAutoBan(reportedUser);
    
    if (banResult.banned) {
        report.actionTaken = banResult.duration === '24h' ? '24h_ban' : '7d_ban';
        await report.save();
    }
    
    return res.status(200).json(
        new ApiResponse(200, {
            reportId: report._id,
            reportCount: reportedUser.reportCount,
            actionTaken: banResult
        }, "Report submitted successfully")
    );
});

// Check ban status (for user to see their own status)
const getBanStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    // Check if ban expired
    const now = new Date();
    if (user.isBanned && user.banExpiresAt && user.banExpiresAt < now) {
        user.isBanned = false;
        user.banExpiresAt = null;
        user.banReason = null;
        user.reportCount = 0;
        await user.save();
    }
    
    // Check weekly reset
    await checkAndResetWeeklyBans(user);
    
    const inProbation = isInProbation(user);
    
    return res.status(200).json(
        new ApiResponse(200, {
            isBanned: user.isBanned,
            banExpiresAt: user.banExpiresAt,
            banReason: user.banReason,
            reportCount: user.reportCount,
            weeklyBanCount: user.weeklyBanCount,
            inProbation: inProbation,
            probationExpiresAt: user.probationExpiresAt,
            reportsGiven: user.reportsGiven
        }, "Ban status retrieved")
    );
});

export {
    submitReport,
    getBanStatus
};
