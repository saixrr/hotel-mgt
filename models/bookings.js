'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class bookings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  bookings.init({
    userid: DataTypes.INTEGER,
    hid: DataTypes.INTEGER,
    fromdate: DataTypes.DATEONLY,
    todate: DataTypes.DATEONLY,
    price: DataTypes.INTEGER,
    hname: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'bookings',
  });
  return bookings;
};