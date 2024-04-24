"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class property extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      property.belongsTo(models.user, {
        foreignKey: "userid",
      });
    }
  }
  property.init(
    {
      userid: DataTypes.INTEGER,
      hname: DataTypes.STRING,
      address: DataTypes.STRING,
      city: DataTypes.STRING,
      state: DataTypes.STRING,
      amenities: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "property",
    }
  );
  return property;
};
