const Unit = require("../models/unit");
const User = require("../models/user");

const getAvailableUnits = async (req, res) => {
  try {
    // Get all residents who already have this unit
    // either pending or active.
    const reservedUnitUsers = await User.find({
      role: "RESIDENT",
      status: {
        $in: ["PENDING", "ACTIVE"],
      },
      unitId: {
        $ne: null,
      },
    }).select("unitId");

    const reservedUnitIds = reservedUnitUsers.map(
      user => user.unitId
    );

    const units = await Unit.find({
      status: "VACANT",
      _id: {
        $nin: reservedUnitIds,
      },
    })
      .populate(
        "buildingId",
        "name buildingNumber"
      )
      .sort({
        buildingId: 1,
        floor: 1,
        unitNumber: 1,
      });

    res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error(
      "GET AVAILABLE UNITS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve available units",
    });
  }
};

module.exports = {
  getAvailableUnits,
};