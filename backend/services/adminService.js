const User = require("../models/user");
const Unit = require("../models/unit");

const approveUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== "PENDING") {
    throw new Error("Only pending users can be approved");
  }

  if (user.role === "RESIDENT") {
    if (!user.unitId) {
      throw new Error("Resident must have a unit");
    }

    const unit = await Unit.findById(user.unitId);

    if (!unit) {
      throw new Error("Unit not found");
    }

    if (unit.status === "OCCUPIED") {
      throw new Error("Unit is already occupied");
    }

    user.status = "ACTIVE";
    unit.status = "OCCUPIED";

    await user.save();
    await unit.save();

    return user;
  }

  user.status = "ACTIVE";

  await user.save();

  return user;
};

const rejectUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== "PENDING") {
    throw new Error("Only pending users can be rejected");
  }

  user.status = "REJECTED";

  await user.save();

  return user;
};

module.exports = {
  approveUser,
  rejectUser,
};