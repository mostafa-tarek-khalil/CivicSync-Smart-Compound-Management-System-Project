const notificationService = require("../services/notificationService");

const list = async (req, res) => {
    try {
        const notifications = await notificationService.getNotifications(
            req.user.userId,
            req.query.unread === "true"
        );
        return res.status(200).json({ success: true, count: notifications.length, data: notifications });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to retrieve notifications" });
    }
};

const markRead = async (req, res) => {
    try {
        const notification = await notificationService.markAsRead(req.user.userId, req.params.id);
        if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
        return res.status(200).json({ success: true, data: notification });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const markAllRead = async (req, res) => {
    try {
        const result = await notificationService.markAllAsRead(req.user.userId);
        return res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update notifications" });
    }
};

const remove = async (req, res) => {
    try {
        const notification = await notificationService.deleteNotification(req.user.userId, req.params.id);
        if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
        return res.status(200).json({ success: true, message: "Notification deleted" });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { list, markRead, markAllRead, remove };
