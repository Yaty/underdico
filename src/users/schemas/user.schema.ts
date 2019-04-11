import * as mongoose from 'mongoose';

export const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
  },
  password: String,
  email: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});
