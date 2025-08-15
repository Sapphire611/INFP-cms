import mongoose, { Document, Schema } from "mongoose";

export interface IComment extends Document {
  name: string;
  email: string;
  movie_id: mongoose.Schema.Types.ObjectId;
  text: string;
  date: Date;
}

const commentSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: false,
      lowercase: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please provide a valid email"],
    },
    movie_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please provide a movie ID"],
      ref: "Movie", // 假设存在 Movie 模型
    },
    text: {
      type: String,
      required: [true, "Please provide text content"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Please provide a date"],
    },
  },
  {
    timestamps: true,
    bufferTimeoutMS: 30000,
  },
);

export default mongoose.models.Comment ?? mongoose.model<IComment>("comments", commentSchema);
