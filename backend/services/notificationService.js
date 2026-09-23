const Notification = require("../models/notification");
const User = require("../models/user");
let socketServer = null;

const setSocketServer = (io) => {
    socketServer = io;
};

const createNotification = async ({ userId, type, title, message, relatedId = null }) => {
    if (!userId) return null;
    try {
        const notification = await Notification.create({ userId, type, title, message, relatedId });
        socketServer?.to(`user:${userId}`).emit("notification:new", notification);
        return notification;
    } catch (error) {
        // A notification failure must not roll back the action that produced it.
        console.error("Failed to create notification:", error.message);
        return null;
    }
};

const getNotifications = (userId, unreadOnly = false) => Notification.find({
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
}).sort({ createdAt: -1 }).limit(100);

/**
 * Fan-out a notification to every active user with the given role.
 * Used so e.g. all security officers are told when a new visitor pass is
 * ready or when a visitor checks in. Failures never break the caller.
 */
const notifyRole = async (role, { type, title, message, relatedId = null }) => {
    try {
        const users = await User.find({ role, status: "ACTIVE" }).select("_id");
        await Promise.all(
            users.map((user) =>
                createNotification({
                    userId: user._id,
                    type,
                    title,
                    message,
                    relatedId,
                })
            )
        );
    } catch (error) {
        console.error("Failed to notify role:", error.message);
    }
};

const markAsRead = (userId, notificationId) => Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true, runValidators: true }
);

const markAllAsRead = (userId) => Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
);

const deleteNotification = (userId, notificationId) => Notification.findOneAndDelete({
    _id: notificationId,
    userId,
});

module.exports = { setSocketServer, createNotification, notifyRole, getNotifications, markAsRead, markAllAsRead, deleteNotification };
