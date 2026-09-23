const authService = require("../services/authService");

const register = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "Registration successful. Waiting for admin approval.",
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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.loginUser(
      email,
      password
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: result.token,
        user: {
          id: result.user._id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          status: result.user.status,
        },
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    res.status(200).json({
      success: true,
      message: "User data retrieved successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
        unitId: user.unitId,
        specializations: user.specializations,
        rating: user.rating,
        totalReviews: user.totalReviews,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const updateMe = async (req, res) => {
  try {
    const user = await authService.updateCurrentUser(
      req.user.userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
        unitId: user.unitId,
        specializations: user.specializations,
        rating: user.rating,
        totalReviews: user.totalReviews,
        lastLoginAt: user.lastLoginAt,
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
  register,
  login,
  getMe,
  updateMe,
};