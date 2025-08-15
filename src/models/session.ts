import mongoose, { Document, Schema } from "mongoose";

export interface ISession extends Document {
  user_id: string;
  jwt: string;
}

const SessionSchema: Schema = new Schema(
  {
    user_id: {
      type: String,
      required: [true, "Please provide a user ID"],
    },
    jwt: {
      type: String,
      required: [true, "Please provide a JWT token"],
    },
  },
  {
    timestamps: true,
    bufferTimeoutMS: 30000,
  },
);

export default mongoose.models.Session ?? mongoose.model<ISession>("Session", SessionSchema);
