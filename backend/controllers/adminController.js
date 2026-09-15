const adminService = require("../services/adminService");

const approveUser = async (req, res) => {
  try {
    const user = await adminService.approveUser(req.params.userId);

    res.status(200).json({
      success: true,
      message: "User approved successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const rejectUser = async (req, res) => {
  try {
    const user = await adminService.rejectUser(req.params.userId);

    res.status(200).json({
      success: true,
      message: "User rejected successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  approveUser,
  rejectUser,
};