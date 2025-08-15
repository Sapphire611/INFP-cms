import mongoose, { Document, Schema } from "mongoose";

export interface ITheater extends Document {
  name: string;
  location: string;
  capacity: number;
  screens: number;
  showing_movies: mongoose.Schema.Types.ObjectId[];
  amenities: string[];
  opening_hours: string;
}

const TheaterSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a theater name"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Please provide a location"],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Please provide seating capacity"],
    },
    screens: {
      type: Number,
      required: [true, "Please provide number of screens"],
    },
    showing_movies: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Movie",
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    opening_hours: {
      type: String,
      required: [true, "Please provide opening hours"],
    },
  },
  {
    timestamps: true,
    bufferTimeoutMS: 30000,
  },
);

export default mongoose.models.Theater ?? mongoose.model<ITheater>("Theater", TheaterSchema);
