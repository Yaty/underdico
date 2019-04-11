import * as mongoose from 'mongoose';
import { scrypt, randomBytes } from 'crypto';

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

const SCRYPT_SEPARATOR = '$';
const SCRYPT_MEMBERS_ENCODING = 'hex';

UserSchema.pre('save', function(next) {
  const user = this;

  // Make sure not to rehash the password if it is already hashed
  if (!user.isModified('password')) {
    return next();
  }

  // Hash the password
  const scryptLen = 64;
  const salt = randomBytes(scryptLen);

  scrypt(user.password, salt, scryptLen, (err, derivedKey) => {
    if (err) {
      return next(err);
    }

    user.password =
      scryptLen +
      SCRYPT_SEPARATOR +
      salt.toString(SCRYPT_MEMBERS_ENCODING) +
      SCRYPT_SEPARATOR +
      derivedKey.toString(SCRYPT_MEMBERS_ENCODING);

    next();
  });
});

UserSchema.methods.checkPassword = function(
  password: string,
): Promise<boolean> {
  const user = this;

  return new Promise((resolve, reject) => {
    const hashedPassword = user.password as string;
    const [scryptLen, salt, expectedDerivedKey] = hashedPassword.split(SCRYPT_SEPARATOR);

    scrypt(password, salt, Number(scryptLen), (err, derivedKey) => {
      if (err) {
        return reject(err);
      }

      resolve(expectedDerivedKey === derivedKey.toString(SCRYPT_MEMBERS_ENCODING));
    });
  });
};
