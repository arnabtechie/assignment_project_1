import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    required: false
  }
},{
  timestamps: true,
  versionKey: false
});

userSchema.pre('save', function (next) {
    let user = this;
    if (!user.isModified('password'))
        return next();
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(user.password, salt, function(err, hash) {
        if (err) {
            return next(err);
        }
        user.password = hash;
        next();
        });
    });
});


userSchema.index({ username: 1 });

const User = mongoose.model('User', userSchema);

export default User;