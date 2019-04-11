import * as mongoose from 'mongoose';

export const WordSchema = new mongoose.Schema({
  word: {
    type: String,
    trim: true,
  },
  definition: {
    type: String,
    trim: true,
  },
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  votes: [{
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    score: Number,
  }],
}, {
  timestamps: true,
});
