import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
}, {
  timestamps: true,
  versionKey: false
});


const Question = mongoose.model('Question', questionSchema);

export default Question;